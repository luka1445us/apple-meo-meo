export default async (req) => {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await req.json();
        const { message, messageId } = body;

        if (!message) {
            return new Response('Message is required', { status: 400 });
        }

        const token = '8605786732:AAE-9RcnY3JVt7UfECtME6ruEx-RPJUaiTI';
        const chatId = '-5240434843';

        if (!token || !chatId) {
            return new Response('Configuration missing', { status: 500 });
        }

        const baseUrl = `https://api.telegram.org/bot${token}`;
        let pinId;

        if (messageId) {
            fetch(`${baseUrl}/unpinChatMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: Number.parseInt(messageId) })
            }).catch(() => {});

            const editRes = await fetch(`${baseUrl}/editMessageText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    message_id: Number.parseInt(messageId),
                    text: message,
                    parse_mode: 'HTML'
                })
            });

            if (editRes.ok) pinId = Number.parseInt(messageId);
        } else {
            const sendRes = await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
            });

            if (sendRes.ok) {
                const data = await sendRes.json();
                pinId = data.result.message_id;
            }
        }

        if (pinId) {
            fetch(`${baseUrl}/pinChatMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, message_id: pinId, disable_notification: false })
            }).catch(() => {});

            return new Response(JSON.stringify({ pinId }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Failed to send/edit message' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
