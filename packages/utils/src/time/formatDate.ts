const defaultFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

export const formatDate = (value: Date, formatter = defaultFormatter) => {
  return formatter.format(value);
};
