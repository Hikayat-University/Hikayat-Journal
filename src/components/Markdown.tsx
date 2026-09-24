import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';

// remark-breaks menjaga satu Enter tetap jadi baris baru, sehingga artikel
// lama yang ditulis sebagai teks biasa tampil sama seperti sebelumnya.
// HTML mentah di dalam teks tidak dirender (bawaan react-markdown).
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith('http');
            return (
              <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
