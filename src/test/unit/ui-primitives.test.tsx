import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  buttonVariants,
  Badge,
  Input,
  Textarea,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Container,
  PageHeader,
} from '@/components/ui';

describe('UI Primitives — Design System Foundations', () => {
  describe('Button Component', () => {
    it('renders with default primary variant and handles click', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Submit Paper</Button>);

      const btn = screen.getByRole('button', { name: /submit paper/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('bg-ink');
      expect(btn).toHaveClass('text-paper');

      fireEvent.click(btn);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders secondary and destructive variants correctly', () => {
      const { rerender } = render(<Button variant="secondary">Outline Action</Button>);
      let btn = screen.getByRole('button', { name: /outline action/i });
      expect(btn).toHaveClass('border-ink');

      rerender(<Button variant="destructive">Delete Folio</Button>);
      btn = screen.getByRole('button', { name: /delete folio/i });
      expect(btn).toHaveClass('bg-oxblood');
    });

    it('supports loading state with spinner and disables button', () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Uploading
        </Button>
      );

      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      expect(btn).toHaveAttribute('aria-busy', 'true');

      fireEvent.click(btn);
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('renders left and right icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          Iconic Button
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('exports buttonVariants utility for styling Next.js Link elements', () => {
      const classes = buttonVariants({ variant: 'outline', size: 'sm' });
      expect(classes).toContain('border-ink/20');
      expect(classes).toContain('h-8');
    });
  });

  describe('Badge Component', () => {
    it('renders default neutral badge with monospace styling', () => {
      render(<Badge>COMP-101</Badge>);
      const badge = screen.getByText('COMP-101');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('font-mono');
      expect(badge).toHaveClass('bg-bone');
      expect(badge).toHaveClass('text-ash');
    });

    it('renders oxblood and solid-oxblood status variants', () => {
      const { rerender } = render(<Badge variant="oxblood">Verified</Badge>);
      let badge = screen.getByText('Verified');
      expect(badge).toHaveClass('text-oxblood');

      rerender(<Badge variant="solid-oxblood">Urgent</Badge>);
      badge = screen.getByText('Urgent');
      expect(badge).toHaveClass('bg-oxblood');
      expect(badge).toHaveClass('text-paper');
    });

    it('supports status dot indicator', () => {
      const { container } = render(
        <Badge variant="oxblood" dot>
          Active
        </Badge>
      );
      const dot = container.querySelector('.rounded-full');
      expect(dot).toBeInTheDocument();
      expect(dot).toHaveClass('bg-oxblood');
    });
  });

  describe('Input Component', () => {
    it('renders input with label and helper text', () => {
      render(
        <Input
          id="course-title"
          label="Course Title"
          helperText="Enter official catalogue name"
          placeholder="e.g. Advanced Fluid Mechanics"
        />
      );

      expect(screen.getByLabelText(/course title/i)).toBeInTheDocument();
      expect(screen.getByText('Enter official catalogue name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('e.g. Advanced Fluid Mechanics')).toBeInTheDocument();
    });

    it('displays error message and sets aria-invalid', () => {
      render(
        <Input
          id="email-input"
          label="Institutional Email"
          error="Must be a valid .edu address"
        />
      );

      const input = screen.getByLabelText(/institutional email/i);
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Must be a valid .edu address')).toBeInTheDocument();
      expect(input).toHaveClass('border-oxblood');
    });

    it('renders with left icon slot', () => {
      render(
        <Input
          placeholder="Search..."
          leftIcon={<span data-testid="search-glyph">🔍</span>}
        />
      );

      expect(screen.getByTestId('search-glyph')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search...')).toHaveClass('pl-10');
    });
  });

  describe('Textarea & Select Components', () => {
    it('renders Textarea with label, error, and custom rows', () => {
      render(
        <Textarea
          id="doc-desc"
          label="Abstract"
          rows={6}
          error="Abstract too short"
        />
      );

      const textarea = screen.getByLabelText(/abstract/i);
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('rows', '6');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Abstract too short')).toBeInTheDocument();
    });

    it('renders Select with options and handles selection', () => {
      const handleChange = vi.fn();
      render(
        <Select
          id="semester-select"
          label="Semester"
          onChange={handleChange}
          options={[
            { value: 'sem-1', label: 'Semester I' },
            { value: 'sem-2', label: 'Semester II' },
          ]}
        />
      );

      const select = screen.getByLabelText(/semester/i);
      expect(select).toBeInTheDocument();
      fireEvent.change(select, { target: { value: 'sem-2' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Card Component Family', () => {
    it('renders Card with Header, Title, Description, Content, and Footer', () => {
      render(
        <Card variant="default" data-testid="test-card">
          <CardHeader>
            <CardTitle>Folio Title</CardTitle>
            <CardDescription>Curated academic note</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Body content of folio</p>
          </CardContent>
          <CardFooter>
            <span>Footer Metadata</span>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('test-card')).toHaveClass('bg-card');
      expect(screen.getByText('Folio Title')).toHaveClass('font-display');
      expect(screen.getByText('Curated academic note')).toBeInTheDocument();
      expect(screen.getByText('Body content of folio')).toBeInTheDocument();
      expect(screen.getByText('Footer Metadata')).toBeInTheDocument();
    });
  });

  describe('Container & PageHeader Components', () => {
    it('renders Container enforcing container-editorial max width', () => {
      render(
        <Container as="section" data-testid="editorial-container">
          <p>Inner content</p>
        </Container>
      );

      const container = screen.getByTestId('editorial-container');
      expect(container.tagName.toLowerCase()).toBe('section');
      expect(container).toHaveClass('container-editorial');
    });

    it('renders PageHeader with eyebrow, title, description, and action slot', () => {
      render(
        <PageHeader
          eyebrow="Academic Repository"
          eyebrowNumber="VOL. 01"
          title="Document Catalog"
          description="Browse syllabus notes and previous-year examination papers."
          action={<Button size="sm">Contribute</Button>}
        />
      );

      expect(screen.getByText('VOL. 01')).toHaveClass('text-oxblood');
      expect(screen.getByText('Academic Repository')).toBeInTheDocument();
      expect(screen.getByText('Document Catalog')).toHaveClass('font-display');
      expect(screen.getByText(/browse syllabus notes/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /contribute/i })).toBeInTheDocument();
    });
  });
});
