// The three bouncing dots shown while Camri is working on an answer.
export default function CamriTyping() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-4 py-3 shadow-sm" aria-label="Camri is typing" role="status">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 rounded-full bg-[#b39b88]" style={{ animation: 'camri-dot 1.2s infinite', animationDelay: `${i * 0.18}s` }} />
      ))}
    </div>
  )
}
