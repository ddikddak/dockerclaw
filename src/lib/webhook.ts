/**
 * Utilitat per enviar webhooks als agents
 */

interface WebhookPayload {
  event: string;
  action?: string;
  card_id: string;
  data?: Record<string, any>;
}

export async function sendWebhook(webhookUrl: string, payload: WebhookPayload): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'DockerClaw/1.0',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook failed: ${response.status} ${response.statusText}`);
      return false;
    }

    console.log(`Webhook sent to ${webhookUrl}: ${payload.event}`);
    return true;
  } catch (error) {
    console.error('Error sending webhook:', error);
    return false;
  }
}
