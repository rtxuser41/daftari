export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('ar-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 }).format(value);
};
