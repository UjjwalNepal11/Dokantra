export function updatePageTitle(title: string) {
  document.title = title
}

export function updateMetaTag(name: string, content: string) {
  let tag = document.querySelector(`meta[name="${name}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('name', name)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function updateMetaProperty(property: string, content: string) {
  let tag = document.querySelector(`meta[property="${property}"]`)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute('property', property)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

export function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', url)
}

export function removeMetaTag(name: string) {
  const tag = document.querySelector(`meta[name="${name}"]`)
  if (tag) tag.remove()
}

export function removeMetaProperty(property: string) {
  const tag = document.querySelector(`meta[property="${property}"]`)
  if (tag) tag.remove()
}
