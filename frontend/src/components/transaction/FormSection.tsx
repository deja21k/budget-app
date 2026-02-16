import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const FormSection = ({
  title,
  description,
  children,
  className = '',
}: FormSectionProps) => {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="border-b border-slate-100 pb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
};

export default FormSection;
