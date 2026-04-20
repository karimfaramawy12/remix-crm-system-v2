export const formatCurrency = (amount: number, currencyCode: string = 'EGP', lang: string = 'en') => {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: currencyCode || 'EGP',
    }).format(amount);
  } catch (e) {
    // Fallback if currency code is invalid or not supported
    return `${currencyCode || 'EGP'} ${amount.toLocaleString()}`;
  }
};
