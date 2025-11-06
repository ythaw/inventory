export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-120px)] py-6">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-purple-darker mb-2 tracking-tight">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
        </div>
        <div className="space-y-3">
          {children}
        </div>
      </div>
    </div>
  );
}


