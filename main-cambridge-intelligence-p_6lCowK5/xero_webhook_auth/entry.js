export default defineComponent({
  async run({ steps, $ }) {
    const { createHmac } = await import('crypto');

    // Replace with your real Xero Webhook Signing Key
    const WEBHOOK_SIGNING_KEY = "hZ2Ve0vtq/eQ8UgVt3VqligF/u/HpiW4OPy8+6yyGFlJaOg+252YBO5H1zGV4dPU3oGgRS7Q/YIRCNFa4TmmAQ==";

    // 1) Get the **raw** body string exactly as Xero sent it
    const raw_body_str = steps.trigger.event.body;
    console.log("raw_body:", raw_body_str);

    // 2) Extract 'x-xero-signature' from headers
    // const received_signature = steps.trigger.event.headers.at(-1);
    // console.log("received_signature:", received_signature);
    const headers = steps.trigger.event.headers;
    const signatureIndex = headers.indexOf("x-xero-signature");
    
    const received_signature = signatureIndex !== -1 ? headers[signatureIndex + 1] : null;
    console.log("received_signature:", received_signature);

    // 3) Compute your own signature on the raw string
    const computed_signature = createHmac('sha256', WEBHOOK_SIGNING_KEY)
      .update(raw_body_str)
      .digest("base64");
    console.log("computed_signature:", computed_signature);

    // 4) If there's an "intent to receive" challenge, respond to it
    try {
      const body_json = JSON.parse(raw_body_str);
      if ("challenge" in body_json) {
        const challenge = body_json.challenge;
        console.log("🔄 Intent to receive challenge detected, responding...");
        
        await $.respond({
          status: 200,
          body: { challenge }
        });
        return;
      }
    } catch (error) {
      console.log("⚠️ JSON parsing error (no challenge field):", error.message);
      // If parsing fails, it's okay—no challenge to handle
    }

    // 5) Compare signatures
    const statusCode = computed_signature === received_signature ? 200 : 401;
    const message = computed_signature === received_signature
      ? "✅ Signature Verified: Valid Request"
      : "❌ Signature Mismatch: Invalid Request";

    console.log(message);

    await $.respond({
      status: statusCode,
      body: { computed_hash: computed_signature }
    });
  }
});