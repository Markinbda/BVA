interface PageHeaderProps {
  title: string;
  subtitle?: string;
  image?: string;
}

const PageHeader = ({ title, subtitle, image }: PageHeaderProps) => {
  return (
    <section className="relative bg-primary py-16 text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--accent)/0.06),transparent_60%)]" />
      <div className="container relative mx-auto px-4 text-center">
        <h1 className="font-heading text-4xl font-bold uppercase tracking-wide md:text-5xl opacity-0 animate-fade-in">
          {title}
        </h1>
        {subtitle && (
          <p className="mx-auto mt-4 max-w-2xl text-lg text-primary-foreground/60 opacity-0 animate-fade-in" style={{ animationDelay: "150ms" }}>
            {subtitle}
          </p>
        )}
        {image && (
          <div className="mt-6 flex justify-center opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <img src={image} alt="" className="max-h-48 w-auto object-contain" />
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
    </section>
  );
};

export default PageHeader;
