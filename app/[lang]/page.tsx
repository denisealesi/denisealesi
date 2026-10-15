import {FadeIn, FadeUp} from '@/components/Animate'
import ContactsView from '@/components/ContactsView'
import {withContactFallback} from '@/lib/contacts'
import {getYouTubeThumbnail} from '@/lib/video'
import {client} from '@/sanity/lib/client'
import {urlFor} from '@/sanity/lib/image'
import type {Contatti, Header, Opera, Video} from '@/types'
import {PortableText} from '@portabletext/react'
import Image from 'next/image'
import Link from 'next/link'
import {defineQuery} from 'next-sanity'

type HomePageData = {
  header: Header | null
  letterarie: Opera[]
  visive: Opera[]
  video: Video[]
  contatti: Contatti | null
}

const copy = {
  it: {role: 'Autrice · artista visiva', literary: 'Opere letterarie', allLiterary: 'Tutte le opere letterarie', visual: 'Opere visive', allVisual: 'Tutte le opere visive', video: 'Video', allVideos: 'Tutti i video', watchVideo: 'Guarda il video'},
  en: {role: 'Author · visual artist', literary: 'Literary works', allLiterary: 'All literary works', visual: 'Visual works', allVisual: 'All visual works', video: 'Video', allVideos: 'All videos', watchVideo: 'Watch the video'},
  es: {role: 'Autora · artista visual', literary: 'Obras literarias', allLiterary: 'Todas las obras literarias', visual: 'Obras visuales', allVisual: 'Todas las obras visuales', video: 'Vídeo', allVideos: 'Todos los vídeos', watchVideo: 'Ver el vídeo'},
} as const

const HOME_QUERY = defineQuery(`{
    "header": *[_id == "header"][0]{
      ritratto,
      "citazione": coalesce(traduzioni[language == $lang][0].citazione, traduzioni[language == "it"][0].citazione),
      "fonteCitazione": coalesce(traduzioni[language == $lang][0].fonteCitazione, traduzioni[language == "it"][0].fonteCitazione)
    },
    "letterarie": *[_type == "opera" && categoria == "letteraria" && (!defined(stato) || stato == "pubblicata")] | order(ordine asc, _createdAt desc){
      _id, "slug": slug.current, categoria, immagine, anno, ordine,
      "titolo": coalesce(traduzioni[language == $lang][0].titolo, traduzioni[language == "it"][0].titolo, traduzioni[0].titolo)
    },
    "visive": *[_type == "opera" && categoria == "visiva" && (!defined(stato) || stato == "pubblicata")] | order(ordine asc, _createdAt desc){
      _id, "slug": slug.current, categoria, immagine, anno, ordine,
      "titolo": coalesce(traduzioni[language == $lang][0].titolo, traduzioni[language == "it"][0].titolo, traduzioni[0].titolo)
    },
    "video": *[_type == "video"] | order(inEvidenza desc, data desc, _createdAt desc){
      _id, "slug": slug.current, url,
      "titolo": coalesce(traduzioni[language == $lang][0].titolo, traduzioni[language == "it"][0].titolo, traduzioni[0].titolo, titolo)
    },
    "contatti": *[_id == "contatti"][0]{
      telefono,
      email,
      "fotoUrl": foto.asset->url,
      "fotoAlt": foto.alt,
      social[]{_key, nome, url}
    }
  }`)

async function getHomeData(lang: string): Promise<HomePageData> {
  return client.fetch<HomePageData>(HOME_QUERY, {lang})
}

function HomeWorksSection({title, linkLabel, href, opere, lang, alternate = false}: {title: string; linkLabel: string; href: string; opere: Opera[]; lang: string; alternate?: boolean}) {
  return (
    <section className={`border-t border-black/15 px-6 py-24 text-[#20231f] md:px-12 lg:py-32 ${alternate ? 'bg-[#e5ddd0]' : 'bg-[#eee8dc]'}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col gap-8 border-b border-black/20 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-4xl tracking-[-0.03em] md:text-6xl">{title}</h2>
          <Link href={`/${lang}/${href}`} className="hidden text-[10px] uppercase tracking-[0.24em] text-black/55 transition-colors hover:text-black sm:block">{linkLabel} →</Link>
        </div>
        {opere.length ? (
          <div className={`grid sm:grid-cols-2 ${alternate ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
            {opere.map((opera, index) => (
              <FadeIn key={opera._id} delay={index * 0.12} className={`${alternate ? 'bg-[#e5ddd0]' : 'bg-[#eee8dc]'} border-b border-r border-black/15`}>
                <Link href={`/${lang}/opere/${opera.slug || opera._id}`} className="group block p-4 pb-7">
                  <div className={`relative mb-5 overflow-hidden ${alternate ? 'aspect-video' : 'aspect-[4/5]'}`}>
                    {opera.immagine ? <Image
                      src={opera.categoria === 'letteraria'
                        ? urlFor(opera.immagine).ignoreImageParams().width(900).url()
                        : urlFor(opera.immagine).width(1200).height(675).fit('crop').url()}
                      alt={opera.titolo || 'Opera'}
                      fill
                      sizes={`(max-width: 640px) 100vw, (max-width: 1024px) 50vw, ${alternate ? '33vw' : '25vw'}`}
                      className={`${opera.categoria === 'letteraria' ? 'object-contain p-2' : 'object-cover'} transition duration-700 group-hover:scale-[1.025]`}
                    /> : null}
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-serif text-xl leading-tight text-[#20231f]">{opera.titolo}</h3>
                    {opera.anno ? <span className="shrink-0 text-[9px] tracking-widest text-black/40">{opera.anno}</span> : null}
                  </div>
                </Link>
              </FadeIn>
            ))}
          </div>
        ) : <p className="font-serif text-2xl italic text-black/45">Le opere abiteranno presto questo spazio.</p>}
        <Link href={`/${lang}/${href}`} className="mt-12 inline-block text-[10px] uppercase tracking-[0.24em] text-black/55 sm:hidden">{linkLabel} →</Link>
      </div>
    </section>
  )
}

function HomeVideoSection({title, linkLabel, watchLabel, videos, lang}: {title: string; linkLabel: string; watchLabel: string; videos: Video[]; lang: string}) {
  return (
    <section className="border-t border-black/15 bg-[#eee8dc] px-6 py-24 text-[#20231f] md:px-12 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 flex flex-col gap-8 border-b border-black/20 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-serif text-4xl tracking-[-0.03em] md:text-6xl">{title}</h2>
          <Link href={`/${lang}/video`} className="hidden text-[10px] uppercase tracking-[0.24em] text-black/55 transition-colors hover:text-black sm:block">{linkLabel} →</Link>
        </div>
        {videos.length ? <div className="space-y-px bg-black/15">
          {videos.map((video, index) => {
            const thumbnail = getYouTubeThumbnail(video.url)
            return <FadeIn key={video._id} delay={index * 0.12} className="bg-[#eee8dc]">
              <Link href={`/${lang}/video/${video.slug || video._id}`} className="group grid gap-7 p-4 pb-7 md:grid-cols-[minmax(0,1.7fr)_minmax(15rem,0.8fr)] md:items-center md:gap-10 md:p-6">
                <div className="relative aspect-video overflow-hidden bg-[#20251f]">
                  {thumbnail ? <Image
                    src={thumbnail}
                    alt={video.titolo}
                    fill
                    sizes="(max-width: 768px) 100vw, 70vw"
                    className="object-cover opacity-90 transition duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
                  /> : null}
                  <span aria-hidden="true" className="absolute bottom-5 right-5 flex size-14 items-center justify-center rounded-full border border-white/70 bg-black/25 pl-0.5 text-lg text-white backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:bg-[#c5a46d] group-hover:text-[#20231f]">▶</span>
                </div>
                <div>
                  <h3 className="font-serif text-3xl leading-tight text-[#20231f] md:text-4xl">{video.titolo}</h3>
                  <span className="mt-6 inline-block text-[9px] uppercase tracking-[0.28em] text-black/45">{watchLabel} →</span>
                </div>
              </Link>
            </FadeIn>
          })}
        </div> : <p className="font-serif text-2xl italic text-black/45">Nessun video pubblicato.</p>}
        <Link href={`/${lang}/video`} className="mt-12 inline-block text-[10px] uppercase tracking-[0.24em] text-black/55 sm:hidden">{linkLabel} →</Link>
      </div>
    </section>
  )
}

export default async function Home({params}: {params: Promise<{lang: string}>}) {
  const {lang} = await params
  const data = await getHomeData(lang)
  const text = copy[lang as keyof typeof copy] || copy.it
  const portrait = data.header?.ritratto
  const contacts = withContactFallback(data.contatti)

  return (
    <div className="overflow-hidden bg-[#eee8dc] text-[#20231f]">
      <section className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex overflow-hidden bg-[#292e29] px-4 pb-8 pt-24 sm:px-8 sm:pb-10 sm:pt-28 lg:min-h-screen lg:items-center lg:px-[clamp(3rem,6vw,7rem)] lg:pb-12 lg:pt-28">
          <div className="pointer-events-none absolute inset-0 opacity-35" aria-hidden="true">
            <span className="absolute inset-y-0 left-[12%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <span className="absolute inset-y-0 right-[12%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
          </div>

          {portrait ? <figure className="relative z-10 mx-auto w-full max-w-[850px] lg:w-auto">
            <div className="relative aspect-[850/1277] w-full overflow-hidden bg-[#1d211d] shadow-[0_30px_80px_rgba(0,0,0,0.38)] lg:h-[72vh] lg:max-h-[47rem] lg:w-auto">
              <Image
                src={urlFor(portrait).ignoreImageParams().width(1400).quality(90).url()}
                alt={portrait.alt || 'Ritratto di Denise Alesi'}
                fill
                priority
                sizes="(max-width: 1023px) calc(100vw - 2rem), 34vw"
                className="object-contain grayscale-[20%]"
              />
            </div>
          </figure> : null}
        </div>

        <div className="relative flex min-h-[72vh] flex-col items-center justify-center px-7 py-20 text-center sm:px-12 lg:min-h-screen lg:px-[10vw] lg:pb-16 lg:pt-36">
          <span className="mb-8 font-sans text-[13px] uppercase tracking-[0.3em] text-[#766e60]">{text.role}</span>
          <FadeUp delay={0.15}>
            <div className="mx-auto max-w-2xl">
              <div className="body-copy body-copy--natural text-[#4e4b43]">
                {data.header?.citazione?.length ? <PortableText value={data.header.citazione} /> : <p>Non può esistere spazio tra ciò che fu, che è, e che sarà. Ogni accadimento assume le sembianze di ciò che crediamo, di ciò del quale abbiamo bisogno fosse anche dell’inferno. Solo quando la verità ha luogo è possibile scostare il velo che avvolge ogni pensiero, ogni immagine, allora tutto si trasforma, tutto accade. Il racconto crea la storia, nutre l&apos;immaginazione, contribuisce alla conoscenza di se stessi e delle cose. Si racconta con la parola, si racconta con le ombre, si racconta con la luce.</p>}
              </div>
              <div className="body-copy body-copy--natural mt-5 italic text-[#766e60]">
                {data.header?.fonteCitazione?.length ? <PortableText value={data.header.fonteCitazione} /> : <p>(tratto da <em>Immagini e parole</em> di Denise Alesi)</p>}
              </div>
            </div>
          </FadeUp>
          <span className="absolute bottom-8 right-8 hidden text-[9px] uppercase tracking-[0.3em] text-[#82796a] lg:block [writing-mode:vertical-rl]">Scorri per entrare</span>
        </div>
      </section>

      <HomeWorksSection title={text.literary} linkLabel={text.allLiterary} href="opere-letterarie" opere={data.letterarie} lang={lang} />
      <HomeWorksSection title={text.visual} linkLabel={text.allVisual} href="opere-visive" opere={data.visive} lang={lang} alternate />
      <HomeVideoSection title={text.video} linkLabel={text.allVideos} watchLabel={text.watchVideo} videos={data.video} lang={lang} />
      <ContactsView contattiData={contacts} lang={lang} />
    </div>
  )
}
