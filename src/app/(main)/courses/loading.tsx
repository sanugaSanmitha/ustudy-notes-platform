export default function CoursesLoading() {
  return (
    <div className="min-h-full bg-white">
      <div className="mx-auto max-w-[1280px] animate-pulse px-4 py-10 md:px-16">
        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="h-8 w-56 rounded bg-[#dae2fd]" />
          <div className="h-9 w-[304px] max-w-full rounded-[40px] bg-[#e4eeff]" />
          <div className="h-4 w-72 max-w-full rounded bg-[#f2f3ff]" />
        </div>
        <div className="mb-4 flex justify-center gap-2 overflow-hidden">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="h-8 w-16 shrink-0 rounded-full bg-[#f2f3ff]" />
          ))}
        </div>
        <div className="mb-6 flex justify-center gap-3">
          <div className="h-8 w-20 rounded-full bg-[#004ac6]/20" />
          <div className="h-8 w-12 rounded-full bg-[#f2f3ff]" />
          <div className="h-8 w-12 rounded-full bg-[#f2f3ff]" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-[60px] rounded-[10px] border border-[#c3c6d7] bg-[#f8f9ff]" />
          ))}
        </div>
      </div>
    </div>
  );
}
