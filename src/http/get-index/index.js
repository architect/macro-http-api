exports.handler = async function http (req) {
  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}
