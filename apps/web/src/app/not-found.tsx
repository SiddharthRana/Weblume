import { ButtonLink } from '@/components/button-link';
import { Container } from '@/components/container';

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold text-fg">Page not found</h1>
      <p className="mt-3 text-fg-muted">The page you’re looking for doesn’t exist or has moved.</p>
      <div className="mt-8">
        <ButtonLink href="/">Go home</ButtonLink>
      </div>
    </Container>
  );
}
