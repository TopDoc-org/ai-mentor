import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';

export interface SeoData {
  title: string;
  description: string;
  /** Comma-separated keywords. */
  keywords?: string;
  /** Absolute URL or root-relative path to the social preview image. */
  image?: string;
  /** Route path for canonical + og:url, e.g. '/privacy'. Defaults to '/'. */
  path?: string;
  /** og:type — 'website' (default) or 'article'. */
  type?: string;
  /** Robots directive. Defaults to 'index, follow'. */
  robots?: string;
}

const SITE_NAME = 'Zenamaze';
const DEFAULT_IMAGE = '/social-preview.png';

// Central SEO metadata manager. Sets title, description, keywords, robots,
// canonical, Open Graph and Twitter Card tags per route. SSR-safe: uses Angular's
// Title/Meta and the injected DOCUMENT, so tags are baked into prerendered HTML.
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  private abs(pathOrUrl?: string): string {
    if (!pathOrUrl) return environment.siteUrl;
    if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
    return `${environment.siteUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }

  update(data: SeoData): void {
    const url = this.abs(data.path ?? '/');
    const image = this.abs(data.image ?? DEFAULT_IMAGE);
    const type = data.type ?? 'website';
    const robots = data.robots ?? 'index, follow';

    this.title.setTitle(data.title);
    this.setName('description', data.description);
    if (data.keywords) this.setName('keywords', data.keywords);
    this.setName('robots', robots);

    // Open Graph
    this.setProp('og:title', data.title);
    this.setProp('og:description', data.description);
    this.setProp('og:image', image);
    this.setProp('og:url', url);
    this.setProp('og:type', type);
    this.setProp('og:site_name', SITE_NAME);

    // Twitter Card
    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', data.title);
    this.setName('twitter:description', data.description);
    this.setName('twitter:image', image);

    this.setCanonical(url);
  }

  // Inject (or replace) a JSON-LD structured-data block by id.
  setJsonLd(id: string, schema: Record<string, unknown>): void {
    this.doc.getElementById(id)?.remove();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = id;
    script.text = JSON.stringify(schema);
    this.doc.head.appendChild(script);
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProp(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(url: string): void {
    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
