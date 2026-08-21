export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '0 EGP';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }) + ' EGP';
};
