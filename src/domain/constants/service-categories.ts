/**
 * Standardized service categories for Madagascar
 * Catégories standardisées de services pour Madagascar
 */

export const SERVICE_CATEGORIES = {
  // Artisanat & Création
  ARTISANAT_CREATION: {
    code: 'artisanat-creation',
    name: 'Artisanat & Création',
    subcategories: [
      { code: 'menuiserie', name: 'Menuiserie' },
      { code: 'ebenisterie', name: 'Ébénisterie' },
      { code: 'charpenterie', name: 'Charpenterie' },
      { code: 'ferronnerie', name: 'Ferronnerie' },
      { code: 'soudure', name: 'Soudure' },
      { code: 'metallurgie', name: 'Métallurgie' },
      { code: 'bijouterie', name: 'Bijouterie' },
      { code: 'joaillerie', name: 'Joaillerie' },
      { code: 'couture', name: 'Couture' },
      { code: 'broderie', name: 'Broderie' },
      { code: 'textile', name: 'Textile' }
    ]
  },

  // Services Auto & Mécanique
  AUTO_MECANIQUE: {
    code: 'auto-mecanique',
    name: 'Services Auto & Mécanique',
    subcategories: [
      { code: 'mecanicien-auto', name: 'Mécanicien auto' },
      { code: 'mecanicien-moto', name: 'Mécanicien moto' },
      { code: 'carrossier', name: 'Carrossier' },
      { code: 'peinture-auto', name: 'Peinture auto' },
      { code: 'vulcanisateur', name: 'Vulcanisateur' },
      { code: 'electricien-automobile', name: 'Électricien automobile' }
    ]
  },

  // Alimentation & Restauration
  ALIMENTATION_RESTAURATION: {
    code: 'alimentation-restauration',
    name: 'Alimentation & Restauration',
    subcategories: [
      { code: 'hotely-gasy', name: 'Hotely gasy' },
      { code: 'boulangerie', name: 'Boulangerie' },
      { code: 'patisserie', name: 'Pâtisserie' },
      { code: 'traiteur', name: 'Traiteur' },
      { code: 'mpanao-vary', name: 'Mpanao vary' },
      { code: 'bar-a-jus', name: 'Bar à jus' },
      { code: 'glacier', name: 'Glacier' }
    ]
  },

  // Services à la Personne
  SERVICES_PERSONNE: {
    code: 'services-personne',
    name: 'Services à la Personne',
    subcategories: [
      { code: 'coiffeur', name: 'Coiffeur' },
      { code: 'barbier', name: 'Barbier' },
      { code: 'estheticienne', name: 'Esthéticienne' },
      { code: 'manucure', name: 'Manucure' },
      { code: 'massage-traditionnel', name: 'Massage traditionnel' },
      { code: 'blanchisserie', name: 'Blanchisserie' }
    ]
  },

  // Bâtiment & Réparations
  BATIMENT_REPARATIONS: {
    code: 'batiment-reparations',
    name: 'Bâtiment & Réparations',
    subcategories: [
      { code: 'macon', name: 'Maçon' },
      { code: 'carreleur', name: 'Carreleur' },
      { code: 'plombier', name: 'Plombier' },
      { code: 'electricien', name: 'Électricien' },
      { code: 'peintre-batiment', name: 'Peintre en bâtiment' },
      { code: 'reparation-electromenager', name: 'Réparation électroménager' }
    ]
  }
} as const

export type ServiceCategory = keyof typeof SERVICE_CATEGORIES
export type ServiceSubcategory = string

/**
 * Get all categories as a flat list
 */
export function getAllCategories() {
  return Object.values(SERVICE_CATEGORIES).map((cat) => ({
    code: cat.code,
    name: cat.name
  }))
}

/**
 * Get all subcategories for a category
 */
export function getSubcategories(categoryCode: string) {
  const category = Object.values(SERVICE_CATEGORIES).find((cat) => cat.code === categoryCode)
  return category?.subcategories || []
}

/**
 * Get all subcategories as a flat list
 */
export function getAllSubcategories() {
  return Object.values(SERVICE_CATEGORIES).flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      ...sub,
      categoryCode: cat.code,
      categoryName: cat.name
    }))
  )
}

/**
 * Search categories and subcategories by keyword
 */
export function searchCategories(keyword: string) {
  const lowerKeyword = keyword.toLowerCase()
  const results: Array<{
    type: 'category' | 'subcategory'
    code: string
    name: string
    categoryCode?: string
    categoryName?: string
  }> = []

  Object.values(SERVICE_CATEGORIES).forEach((cat) => {
    // Check category name
    if (cat.name.toLowerCase().includes(lowerKeyword)) {
      results.push({
        type: 'category',
        code: cat.code,
        name: cat.name
      })
    }

    // Check subcategories
    cat.subcategories.forEach((sub) => {
      if (sub.name.toLowerCase().includes(lowerKeyword)) {
        results.push({
          type: 'subcategory',
          code: sub.code,
          name: sub.name,
          categoryCode: cat.code,
          categoryName: cat.name
        })
      }
    })
  })

  return results
}
