import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const MODEL = 'claude-sonnet-4-6';

// Occasions/moods a piece can suit and a look can target.
export const OCCASIONS = ['work', 'casual', 'dinner', 'formal', 'date', 'brunch', 'travel'];
