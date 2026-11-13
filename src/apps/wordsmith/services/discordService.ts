/**
 * Service to handle sending reports to Discord via Webhook
 */

export const sendToDiscord = async (webhookUrl: string, blob: Blob, userName: string): Promise<boolean> => {
  try {
    const formData = new FormData();
    
    // Create a file from the blob
    const file = new File([blob], `WordSmith-Report-${Date.now()}.png`, { type: 'image/png' });
    
    formData.append('file', file);
    formData.append('payload_json', JSON.stringify({
      content: `📊 **WordSmith Practice Report** for **${userName}**\nPractice completed at ${new Date().toLocaleString()}`,
      username: 'WordSmith Bot',
      avatar_url: 'https://ais-dev-htg22ilahlcqhdh6gwvi5z-10735257500.us-east5.run.app/favicon.ico' // Use app favicon if available
    }));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Discord Webhook Error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send to Discord:', error);
    return false;
  }
};
