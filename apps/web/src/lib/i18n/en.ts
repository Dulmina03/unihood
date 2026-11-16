// English baseline; add reviewed Sinhala/Tamil dictionaries in their rollout issues.
export const en = {
  landing: {
    titleLead: 'Find your place.', titleIntro: 'Discover your', titleEnd: 'neighborhood.',
    pickerTitle: 'Choose your university', findUniversity: 'Find a university',
    university: 'University', campus: 'Campus', entrance: 'Public entrance',
    openUniversity: 'Open university', noAccount: 'No account needed',
    exploreMap: 'Explore Map', browseAdvertisements: 'Browse Advertisements',
    featuredTitle: 'Spaces for your next chapter.', synthetic: 'Synthetic demonstration',
    loadingUniversities: 'Loading the public university directory…',
    emptyUniversities: 'No universities are available yet. Please check back soon.',
    noMatchingUniversities: 'No university names match on this page. Try another name or directory page.',
    chooseCampusHint: 'Choose a university, then a campus and public entrance.',
    directoryError: 'We couldn’t load universities', retryUniversities: 'Try universities again',
  },
  explore: {
    titleLead: 'Explore around', titleEnd: 'your university.',
    mapTitleLead: 'Your neighborhood.', mapTitleEnd: 'A new perspective.',
    university: 'University', campus: 'Campus', entrance: 'Public entrance',
    mapStatus: 'Map unavailable',
    filters: 'Filters', share: 'Share', map: 'Map', list: 'List',
    entrances: 'Campus gates', boardings: 'Boardings', essentials: 'Essentials',
    search: 'Find a public entrance', publicPlaces: 'Public places',
    mapUnavailable: 'The map is not connected yet. Explore public campus entrances in the list while the map takes shape.',
    exploreList: 'Explore the list', invalidSelection: 'This selection is invalid',
    loadError: 'We couldn’t load public places', retry: 'Retry public places',
  },
  system: {title: 'Familiar places. Thoughtful details.', edition: 'Campus Teal / Foundation 01'},
  privacy: {
    community: 'Community recommendations appear as advertisements only. They never publish exact boarding pins, official owner prices or confirmed owner vacancies.',
    hidden: 'The exact location is private. No coordinates, precise distance, route, vicinity calculation or owner contact details are provided by this demonstration.',
  },
} as const;
