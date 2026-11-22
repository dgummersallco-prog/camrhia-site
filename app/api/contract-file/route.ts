import { adminDb, userDb, userFromRequest } from '@/lib/stripeServer'

export const dynamic = 'force-dynamic'

const BUCKET = 'contract-files'

// Step one of an upload: hands the browser a one-time upload slot in the private contracts bucket.
export async function POST(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const db = adminDb()
    await db.storage.createBucket(BUCKET, { public: false })
    const path = auth.user.id + '/contract_' + Date.now() + '.pdf'
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path)
    if (error || !data) return Response.json({ error: 'Could not start the upload.' }, { status: 500 })
    return Response.json({ path, token: data.token })
  } catch (e) {
    console.error('contract-file upload', e)
    return Response.json({ error: 'Could not start the upload.' }, { status: 500 })
  }
}

// Gives a short-lived link to a contract file. Row-level security decides who may see it:
// the photographer for her own saved file or any of her contracts, and a client only once it has been sent.
export async function GET(request: Request) {
  try {
    const auth = await userFromRequest(request)
    if (!auth) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
    const u = new URL(request.url)
    const w = u.searchParams.get('w')
    const mine = u.searchParams.get('mine')
    const me: any = userDb(auth.token)
    let path: string | null = null
    let name: string | null = null
    if (mine) {
      const { data } = await me.from('profiles').select('contract_file_path, contract_file_name').eq('id', auth.user.id).maybeSingle()
      path = data?.contract_file_path ?? null
      name = data?.contract_file_name ?? null
    } else if (w) {
      const { data } = await me.from('contracts').select('file_path, file_name').eq('wedding_id', w).maybeSingle()
      path = data?.file_path ?? null
      name = data?.file_name ?? null
    }
    if (!path) return Response.json({ error: 'No contract file.' }, { status: 404 })
    const { data, error } = await adminDb().storage.from(BUCKET).createSignedUrl(path, 600)
    if (error || !data) return Response.json({ error: 'Could not open the file.' }, { status: 500 })
    return Response.json({ url: data.signedUrl, name })
  } catch (e) {
    console.error('contract-file get', e)
    return Response.json({ error: 'Could not open the file.' }, { status: 500 })
  }
}
