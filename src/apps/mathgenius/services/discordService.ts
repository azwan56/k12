/**
 * Service to handle sending reports to Discord via Webhook
 */

import { isValidDiscordWebhookUrl } from '../../../lib/security';

export const sendToDiscord = async (webhookUrl: string, blob: Blob, userName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl) return { success: false, error: 'Empty webhook URL' };
    if (!isValidDiscordWebhookUrl(cleanUrl)) return { success: false, error: 'Invalid Discord webhook URL' };

    const formData = new FormData();

    // Create a file from the blob
    const file = new File([blob], `MathGenius-Grade6-Report-${Date.now()}.png`, { type: 'image/png' });

    formData.append('file', file);
    formData.append('payload_json', JSON.stringify({
      content: `📊 **MathGenius Grade 6 Practice Report** for **${userName}**\nPractice completed at <t:${Math.floor(Date.now() / 1000)}:f>`,
      username: 'MathGenius Bot',
    }));

    const response = await fetch(cleanUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord Webhook Error:', response.status, errorText);
      return { success: false, error: `Discord HTTP ${response.status}: ${errorText.substring(0, 100)}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send to Discord:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};
