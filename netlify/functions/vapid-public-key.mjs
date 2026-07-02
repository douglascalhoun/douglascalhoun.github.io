// API endpoint to get VAPID public key for push notifications
export default async (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }
  
  const publicKey = Netlify.env.get('VAPID_PUBLIC_KEY');
  
  if (!publicKey) {
    return new Response(
      JSON.stringify({ error: 'VAPID public key not configured' }),
      { status: 500, headers }
    );
  }
  
  return new Response(
    JSON.stringify({ publicKey }),
    { status: 200, headers }
  );
};
