import Joi from 'joi';

/**
 * Validation schema for creating a new review
 * Required fields: business_id, title, content, rating
 * Optional fields: experience_date, media_urls
 */
export const createReviewSchema = Joi.object({
  business_id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid business ID format',
    'any.required': 'Business ID is required'
  }),
  title: Joi.string().min(5).max(255).required().messages({
    'string.min': 'Title must be at least 5 characters',
    'string.max': 'Title cannot exceed 255 characters',
    'any.required': 'Review title is required'
  }),
  content: Joi.string().min(10).max(5000).required().messages({
    'string.min': 'Review content must be at least 10 characters',
    'string.max': 'Review content cannot exceed 5000 characters',
    'any.required': 'Review content is required'
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.base': 'Rating must be a number',
    'number.min': 'Rating must be at least 1 star',
    'number.max': 'Rating cannot exceed 5 stars',
    'any.required': 'Rating is required'
  }),
  experience_date: Joi.date().optional().messages({
    'date.base': 'Experience date must be a valid date'
  }),
  media_urls: Joi.array().items(Joi.string().uri()).max(5).optional().messages({
    'array.max': 'Cannot attach more than 5 images'
  })
});

/**
 * Validation schema for updating a review
 * All fields are optional, but at least one must be provided
 */
export const updateReviewSchema = Joi.object({
  title: Joi.string().min(5).max(255).optional(),
  content: Joi.string().min(10).max(5000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
  experience_date: Joi.date().optional(),
  media_urls: Joi.array().items(Joi.string().uri()).max(5).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
