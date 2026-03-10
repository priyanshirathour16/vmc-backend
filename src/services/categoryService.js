import Joi from 'joi';
import { supabase } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Validation Schemas
 */
const createCategorySchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  slug: Joi.string().min(3).max(100).required(),
  icon: Joi.string().max(50).optional(),
  description: Joi.string().max(500).optional(),
  display_order: Joi.number().min(0).optional(),
});

const updateCategorySchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  slug: Joi.string().min(3).max(100).optional(),
  icon: Joi.string().max(50).optional(),
  description: Joi.string().max(500).optional(),
  is_active: Joi.boolean().optional(),
  display_order: Joi.number().min(0).optional(),
});

const createSubcategorySchema = Joi.object({
  category_id: Joi.string().uuid().required(),
  name: Joi.string().min(3).max(100).required(),
  slug: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).optional(),
  display_order: Joi.number().min(0).optional(),
});

const updateSubcategorySchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  slug: Joi.string().min(3).max(100).optional(),
  description: Joi.string().max(500).optional(),
  is_active: Joi.boolean().optional(),
  display_order: Joi.number().min(0).optional(),
});

/**
 * CATEGORY OPERATIONS
 */

/**
 * Get all categories with subcategories count
 */
export const getAllCategories = async (includeInactive = false) => {
  // Query categories table directly with subcategory count via subquery
  let query = supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      icon,
      description,
      is_active,
      display_order,
      created_at,
      updated_at,
      subcategories:subcategories(count)
    `)
    .is('deleted_at', null)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    throw new AppError(`Failed to fetch categories: ${error.message}`, 500);
  }

  // Transform the data to include subcategories_count
  const transformedData = data?.map(cat => ({
    ...cat,
    subcategories_count: cat.subcategories?.[0]?.count || 0,
    subcategories: undefined, // Remove the nested subcategories array to avoid confusion
  })) || [];

  return transformedData;
};

/**
 * Get category by ID with subcategories
 */
export const getCategoryById = async (categoryId) => {
  const { data: category, error: catError } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single();

  if (catError || !category) {
    throw new AppError('Category not found', 404);
  }

  const { data: subcategories, error: subError } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  if (subError) {
    throw new AppError(`Failed to fetch subcategories: ${subError.message}`, 500);
  }

  return { ...category, subcategories: subcategories || [] };
};

/**
 * Create new category
 */
export const createCategory = async (categoryData) => {
  const { value, error } = createCategorySchema.validate(categoryData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Check if slug already exists
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', value.slug)
    .is('deleted_at', null)
    .single();

  if (existingCategory) {
    throw new AppError('Category slug already exists', 409);
  }

  const { data: newCategory, error: insertError } = await supabase
    .from('categories')
    .insert([value])
    .select()
    .single();

  if (insertError) {
    throw new AppError(`Failed to create category: ${insertError.message}`, 500);
  }

  return newCategory;
};

/**
 * Update category
 */
export const updateCategory = async (categoryId, updateData) => {
  const { value, error } = updateCategorySchema.validate(updateData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Verify category exists
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single();

  if (!existingCategory) {
    throw new AppError('Category not found', 404);
  }

  // Check slug uniqueness if being updated
  if (value.slug) {
    const { data: slugExists } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', value.slug)
      .neq('id', categoryId)
      .is('deleted_at', null)
      .single();

    if (slugExists) {
      throw new AppError('Category slug already exists', 409);
    }
  }

  const { data: updatedCategory, error: updateError } = await supabase
    .from('categories')
    .update({ ...value, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(`Failed to update category: ${updateError.message}`, 500);
  }

  return updatedCategory;
};

/**
 * Soft delete category (marks deleted_at)
 */
export const deleteCategory = async (categoryId) => {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .is('deleted_at', null)
    .single();

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  const { data: deletedCategory, error: deleteError } = await supabase
    .from('categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', categoryId)
    .select()
    .single();

  if (deleteError) {
    throw new AppError(`Failed to delete category: ${deleteError.message}`, 500);
  }

  return { message: 'Category soft deleted successfully', data: deletedCategory };
};

/**
 * Restore soft-deleted category
 */
export const restoreCategory = async (categoryId) => {
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .not('deleted_at', 'is', null)
    .single();

  if (!category) {
    throw new AppError('Deleted category not found', 404);
  }

  const { data: restoredCategory, error: restoreError } = await supabase
    .from('categories')
    .update({ deleted_at: null })
    .eq('id', categoryId)
    .select()
    .single();

  if (restoreError) {
    throw new AppError(`Failed to restore category: ${restoreError.message}`, 500);
  }

  return { message: 'Category restored successfully', data: restoredCategory };
};

/**
 * SUBCATEGORY OPERATIONS
 */

/**
 * Get subcategory by ID
 */
export const getSubcategoryById = async (subcategoryId) => {
  const { data: subcategory, error } = await supabase
    .from('subcategories')
    .select(`
      *,
      categories:category_id(id, name, slug, icon)
    `)
    .eq('id', subcategoryId)
    .is('deleted_at', null)
    .single();

  if (error || !subcategory) {
    throw new AppError('Subcategory not found', 404);
  }

  return subcategory;
};

/**
 * Create new subcategory
 */
export const createSubcategory = async (subcategoryData) => {
  const { value, error } = createSubcategorySchema.validate(subcategoryData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Verify category exists
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('id', value.category_id)
    .is('deleted_at', null)
    .single();

  if (!category) {
    throw new AppError('Parent category not found', 404);
  }

  // Check slug uniqueness within category
  const { data: existingSubcategory } = await supabase
    .from('subcategories')
    .select('id')
    .eq('category_id', value.category_id)
    .eq('slug', value.slug)
    .is('deleted_at', null)
    .single();

  if (existingSubcategory) {
    throw new AppError('Subcategory slug already exists in this category', 409);
  }

  const { data: newSubcategory, error: insertError } = await supabase
    .from('subcategories')
    .insert([value])
    .select()
    .single();

  if (insertError) {
    throw new AppError(`Failed to create subcategory: ${insertError.message}`, 500);
  }

  return newSubcategory;
};

/**
 * Update subcategory
 */
export const updateSubcategory = async (subcategoryId, updateData) => {
  const { value, error } = updateSubcategorySchema.validate(updateData);
  if (error) {
    throw new AppError(error.details[0].message, 400);
  }

  // Verify subcategory exists
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('category_id')
    .eq('id', subcategoryId)
    .is('deleted_at', null)
    .single();

  if (!subcategory) {
    throw new AppError('Subcategory not found', 404);
  }

  // Check slug uniqueness within category if being updated
  if (value.slug) {
    const { data: slugExists } = await supabase
      .from('subcategories')
      .select('id')
      .eq('category_id', subcategory.category_id)
      .eq('slug', value.slug)
      .neq('id', subcategoryId)
      .is('deleted_at', null)
      .single();

    if (slugExists) {
      throw new AppError('Subcategory slug already exists in this category', 409);
    }
  }

  const { data: updatedSubcategory, error: updateError } = await supabase
    .from('subcategories')
    .update({ ...value, updated_at: new Date().toISOString() })
    .eq('id', subcategoryId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(`Failed to update subcategory: ${updateError.message}`, 500);
  }

  return updatedSubcategory;
};

/**
 * Soft delete subcategory
 */
export const deleteSubcategory = async (subcategoryId) => {
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('id')
    .eq('id', subcategoryId)
    .is('deleted_at', null)
    .single();

  if (!subcategory) {
    throw new AppError('Subcategory not found', 404);
  }

  const { data: deletedSubcategory, error: deleteError } = await supabase
    .from('subcategories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', subcategoryId)
    .select()
    .single();

  if (deleteError) {
    throw new AppError(`Failed to delete subcategory: ${deleteError.message}`, 500);
  }

  return { message: 'Subcategory soft deleted successfully', data: deletedSubcategory };
};

/**
 * Restore soft-deleted subcategory
 */
export const restoreSubcategory = async (subcategoryId) => {
  const { data: subcategory } = await supabase
    .from('subcategories')
    .select('id')
    .eq('id', subcategoryId)
    .not('deleted_at', 'is', null)
    .single();

  if (!subcategory) {
    throw new AppError('Deleted subcategory not found', 404);
  }

  const { data: restoredSubcategory, error: restoreError } = await supabase
    .from('subcategories')
    .update({ deleted_at: null })
    .eq('id', subcategoryId)
    .select()
    .single();

  if (restoreError) {
    throw new AppError(`Failed to restore subcategory: ${restoreError.message}`, 500);
  }

  return { message: 'Subcategory restored successfully', data: restoredSubcategory };
};

/**
 * Get category tree (for dropdowns/selects)
 */
export const getCategoryTree = async () => {
  const { data, error } = await supabase
    .from('category_tree')
    .select('*')
    .order('category_order', { ascending: true })
    .order('subcategory_order', { ascending: true });

  if (error) {
    throw new AppError(`Failed to fetch category tree: ${error.message}`, 500);
  }

  // Transform flat data into nested structure
  const tree = {};

  data?.forEach((item) => {
    if (!tree[item.category_id]) {
      tree[item.category_id] = {
        id: item.category_id,
        name: item.category_name,
        slug: item.category_slug,
        icon: item.icon,
        order: item.category_order,
        subcategories: [],
      };
    }

    if (item.subcategory_id) {
      tree[item.category_id].subcategories.push({
        id: item.subcategory_id,
        name: item.subcategory_name,
        slug: item.subcategory_slug,
        order: item.subcategory_order,
      });
    }
  });

  return Object.values(tree);
};
