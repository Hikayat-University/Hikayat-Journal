export type NoticeState = { type: 'error' | 'success'; text: string } | null;

export function Notice({ notice }: { notice: NoticeState }) {
  if (!notice) return null;
  return (
    <div className={`alert alert-${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
      {notice.text}
    </div>
  );
}
