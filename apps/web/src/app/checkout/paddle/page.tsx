import type { Metadata } from 'next';
import { Container } from '@/components/container';
import { PaddleCheckout } from './paddle-checkout';

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } };

export default function PaddleCheckoutPage() {
  return (
    <Container>
      <PaddleCheckout />
    </Container>
  );
}
