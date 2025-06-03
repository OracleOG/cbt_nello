'use client';

import NextNProgress from 'nextjs-progressbar';

export default function ProgressBar() {
  return (
    <NextNProgress
      color="#0070f3"
      options={{ showSpinner: true }}
      toastOptions={{ duration: 3000 }}
    />
  );
}
// This component is used to display a progress bar at the top of the page