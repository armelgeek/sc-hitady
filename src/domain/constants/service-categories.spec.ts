import { describe, expect, it } from 'vitest'
import {
  getAllCategories,
  getAllSubcategories,
  getSubcategories,
  searchCategories,
  SERVICE_CATEGORIES
} from './service-categories'

describe('Service Categories', () => {
  describe('SERVICE_CATEGORIES constant', () => {
    it('should have 5 main categories', () => {
      const categories = Object.values(SERVICE_CATEGORIES)
      expect(categories).toHaveLength(5)
    })

    it('should have required fields for each category', () => {
      Object.values(SERVICE_CATEGORIES).forEach((category) => {
        expect(category).toHaveProperty('code')
        expect(category).toHaveProperty('name')
        expect(category).toHaveProperty('subcategories')
        expect(Array.isArray(category.subcategories)).toBe(true)
      })
    })

    it('should have subcategories with code and name', () => {
      Object.values(SERVICE_CATEGORIES).forEach((category) => {
        category.subcategories.forEach((sub) => {
          expect(sub).toHaveProperty('code')
          expect(sub).toHaveProperty('name')
          expect(typeof sub.code).toBe('string')
          expect(typeof sub.name).toBe('string')
        })
      })
    })
  })

  describe('getAllCategories', () => {
    it('should return all categories', () => {
      const categories = getAllCategories()
      expect(categories).toHaveLength(5)
    })

    it('should return categories with code and name', () => {
      const categories = getAllCategories()
      categories.forEach((cat) => {
        expect(cat).toHaveProperty('code')
        expect(cat).toHaveProperty('name')
      })
    })

    it('should include expected categories', () => {
      const categories = getAllCategories()
      const codes = categories.map((cat) => cat.code)

      expect(codes).toContain('artisanat-creation')
      expect(codes).toContain('auto-mecanique')
      expect(codes).toContain('alimentation-restauration')
      expect(codes).toContain('services-personne')
      expect(codes).toContain('batiment-reparations')
    })
  })

  describe('getSubcategories', () => {
    it('should return subcategories for a valid category', () => {
      const subcategories = getSubcategories('artisanat-creation')
      expect(subcategories.length).toBeGreaterThan(0)
    })

    it('should return empty array for invalid category', () => {
      const subcategories = getSubcategories('invalid-category')
      expect(subcategories).toEqual([])
    })

    it('should include expected subcategories for artisanat', () => {
      const subcategories = getSubcategories('artisanat-creation')
      const codes = subcategories.map((sub) => sub.code)

      expect(codes).toContain('menuiserie')
      expect(codes).toContain('bijouterie')
      expect(codes).toContain('couture')
    })
  })

  describe('getAllSubcategories', () => {
    it('should return all subcategories from all categories', () => {
      const subcategories = getAllSubcategories()
      expect(subcategories.length).toBeGreaterThan(20)
    })

    it('should include category information', () => {
      const subcategories = getAllSubcategories()
      subcategories.forEach((sub) => {
        expect(sub).toHaveProperty('code')
        expect(sub).toHaveProperty('name')
        expect(sub).toHaveProperty('categoryCode')
        expect(sub).toHaveProperty('categoryName')
      })
    })

    it('should have unique subcategory codes', () => {
      const subcategories = getAllSubcategories()
      const codes = subcategories.map((sub) => sub.code)
      const uniqueCodes = [...new Set(codes)]

      expect(codes.length).toBe(uniqueCodes.length)
    })
  })

  describe('searchCategories', () => {
    it('should find categories by keyword', () => {
      const results = searchCategories('auto')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.code === 'auto-mecanique')).toBe(true)
    })

    it('should find subcategories by keyword', () => {
      const results = searchCategories('menu')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((r) => r.code === 'menuiserie')).toBe(true)
    })

    it('should be case insensitive', () => {
      const results1 = searchCategories('MENU')
      const results2 = searchCategories('menu')
      expect(results1.length).toBe(results2.length)
    })

    it('should return empty array for no matches', () => {
      const results = searchCategories('xyz123nonexistent')
      expect(results).toEqual([])
    })

    it('should include type field in results', () => {
      const results = searchCategories('coiffeur')
      expect(results.length).toBeGreaterThan(0)
      results.forEach((result) => {
        expect(result).toHaveProperty('type')
        expect(['category', 'subcategory']).toContain(result.type)
      })
    })

    it('should include category context for subcategories', () => {
      const results = searchCategories('menuiserie')
      const subcatResult = results.find((r) => r.type === 'subcategory')

      if (subcatResult) {
        expect(subcatResult).toHaveProperty('categoryCode')
        expect(subcatResult).toHaveProperty('categoryName')
      }
    })
  })

  describe('Category structure validation', () => {
    it('should have Madagascar-specific categories', () => {
      const subcategories = getAllSubcategories()
      const codes = subcategories.map((sub) => sub.code)

      // Check for Madagascar-specific services
      expect(codes).toContain('hotely-gasy')
      expect(codes).toContain('mpanao-vary')
    })

    it('should have comprehensive service coverage', () => {
      const categories = getAllCategories()

      expect(categories.some((c) => c.code === 'artisanat-creation')).toBe(true)
      expect(categories.some((c) => c.code === 'auto-mecanique')).toBe(true)
      expect(categories.some((c) => c.code === 'alimentation-restauration')).toBe(true)
      expect(categories.some((c) => c.code === 'services-personne')).toBe(true)
      expect(categories.some((c) => c.code === 'batiment-reparations')).toBe(true)
    })
  })
})
