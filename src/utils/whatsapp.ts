export const getWhatsAppLink = (phone: string, message: string) => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const sendWhatsAppMessage = (phone: string, message: string) => {
  const link = getWhatsAppLink(phone, message);
  window.open(link, '_blank');
};
