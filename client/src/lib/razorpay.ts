export const loadRazorpay = () => {
    return new Promise((resolve) => {
        if ((window as any).Razorpay) {
            resolve(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
};

interface RazorpayCheckoutOptions {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    email: string;
    onSuccess: (response: any) => Promise<void> | void;
    onFailure?: (error: any) => void;
}

export const openRazorpayCheckout = async (options: RazorpayCheckoutOptions) => {
    const res = await loadRazorpay();
    if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        return;
    }

    const rzpOptions = {
        key: options.keyId,
        amount: options.amount,
        currency: options.currency,
        name: options.name,
        description: options.description,
        order_id: options.orderId,
        handler: options.onSuccess,
        prefill: {
            email: options.email,
        },
        theme: {
            color: "#6C63FF",
        },
        modal: {
            ondismiss: () => {
                if (options.onFailure) {
                    options.onFailure({ reason: 'dismissed' });
                }
            }
        }
    };

    const rzp = new (window as any).Razorpay(rzpOptions);

    rzp.on('payment.failed', function (response: any) {
        if (options.onFailure) {
            options.onFailure(response.error);
        }
    });

    rzp.open();
};
