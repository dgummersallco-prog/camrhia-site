"use client"
import { Fragment } from 'react'
import { FONT_HREF, sigFamily, signedLines } from '@/lib/contractSign'
import type { SigInfo } from '@/lib/contractSign'

const sigStyle = (style: string | null) => ({ fontFamily: sigFamily(style), fontSize: '2em', lineHeight: 1.2, borderBottom: '1px solid currentColor', padding: '0 8px' })

export function ContractText({ body, photographer, client }: { body: string; photographer: SigInfo | null; client: SigInfo | null }) {
  const { lines, marks, slots } = signedLines(body, photographer, client)
  const fallback = slots < 2 && (photographer || client)
  return (
    <>
      <link rel="stylesheet" href={FONT_HREF} />
      {lines.map((l, i) => {
        const m = marks[i]
        return (
          <Fragment key={i}>
            {m ? (m.kind === 'sig' ? <>Signature: <span style={sigStyle(m.info.style)}>{m.info.name}</span></> : <>Date: {m.info.date}</>) : l}
            {i < lines.length - 1 ? '\n' : ''}
          </Fragment>
        )
      })}
      {fallback && (
        <>
          {'\n\n'}
          {photographer && <>Photographer: <span style={sigStyle(photographer.style)}>{photographer.name}</span> ({photographer.date}){'\n'}</>}
          {client && <>Client: <span style={sigStyle(client.style)}>{client.name}</span> ({client.date}){'\n'}</>}
        </>
      )}
    </>
  )
}
