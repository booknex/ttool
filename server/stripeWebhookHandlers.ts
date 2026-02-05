import { getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';

export class StripeWebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }
    
    const stripe = await getUncachableStripeClient();
    
    let event;
    try {
      const webhooks = await stripe.webhookEndpoints.list({ limit: 1 });
      const webhookSecret = webhooks.data[0]?.secret;
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      } else {
        const payloadStr = payload.toString();
        event = JSON.parse(payloadStr);
      }
    } catch (err: any) {
      console.log('Processing webhook without signature verification');
      const payloadStr = payload.toString();
      event = JSON.parse(payloadStr);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await StripeWebhookHandlers.handleCheckoutCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await StripeWebhookHandlers.handlePaymentSucceeded(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }
  }

  static async handleCheckoutCompleted(session: any): Promise<void> {
    const invoiceId = session.metadata?.invoiceId;
    if (!invoiceId) {
      console.log('Checkout completed but no invoiceId in metadata');
      return;
    }

    try {
      await storage.updateInvoice(invoiceId, {
        status: 'paid',
        paidAt: new Date(),
        paymentMethod: 'stripe',
        stripePaymentIntentId: session.payment_intent,
      });
      console.log(`Invoice ${invoiceId} marked as paid`);
    } catch (error) {
      console.error('Error updating invoice after payment:', error);
    }
  }

  static async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    const invoiceId = paymentIntent.metadata?.invoiceId;
    if (!invoiceId) return;

    try {
      const invoice = await storage.getInvoice(invoiceId);
      if (invoice && invoice.status !== 'paid') {
        await storage.updateInvoice(invoiceId, {
          status: 'paid',
          paidAt: new Date(),
          paymentMethod: 'stripe',
          stripePaymentIntentId: paymentIntent.id,
        });
        console.log(`Invoice ${invoiceId} marked as paid via payment_intent.succeeded`);
      }
    } catch (error) {
      console.error('Error updating invoice from payment_intent:', error);
    }
  }
}
