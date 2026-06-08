export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, company, service, message, subject } = req.body;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Korestack Contact <onboarding@resend.dev>',
        to: ['hello@korestack.tech'],
        subject: subject || 'New Korestack inquiry',
        html: `
          <table style="font-family:sans-serif;font-size:15px;color:#333">
            <tr><td><strong>Name</strong></td><td>${name}</td></tr>
            <tr><td><strong>Email</strong></td><td>${email}</td></tr>
            <tr><td><strong>Company</strong></td><td>${company}</td></tr>
            <tr><td><strong>Service</strong></td><td>${service}</td></tr>
            <tr><td><strong>Message</strong></td><td>${message}</td></tr>
          </table>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Resend API error');
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: err.message });
  }
}
