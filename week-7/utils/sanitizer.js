const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
        .replace(/<[^>]*>/g, '')       
        .replace(/[<>"']/g, (c) => ({   
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
        }[c]))
        .trim();
};

const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [
            key,
            typeof value === 'string' ? sanitizeString(value) : sanitizeObject(value)
        ])
    );
};

const normalizeEmail = (email) => {
    if (typeof email !== 'string') return email;
    return email.toLowerCase().trim();
};

module.exports = { sanitizeString, sanitizeObject, normalizeEmail };
