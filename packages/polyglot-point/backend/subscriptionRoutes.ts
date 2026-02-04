import { Router } from 'express';
import { subscriptionManager } from './services/subscriptionManager.js';
import { languageEnforcer } from './services/languageEnforcer.js';

const router = Router();

/**
 * Get user's subscription status and language access
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = await subscriptionManager.getSubscriptionStatus(sessionId);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      error: 'Failed to get subscription status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Switch active language
 */
router.post('/switch-language', async (req, res) => {
  try {
    const { sessionId, language } = req.body;
    
    if (!sessionId || !language) {
      return res.status(400).json({
        error: 'Session ID and language are required'
      });
    }
    
    const result = await subscriptionManager.switchActiveLanguage(sessionId, language);
    
    if (result.success) {
      const responseMessage = await languageEnforcer.handleLanguageSwitchRequest(sessionId, language);
      
      res.json({
        success: true,
        message: result.message,
        claraResponse: responseMessage,
        newActiveLanguage: language
      });
    } else {
      const responseMessage = await languageEnforcer.handleLanguageSwitchRequest(sessionId, language);
      
      res.status(403).json({
        success: false,
        error: result.message,
        claraResponse: responseMessage,
        requiresUpgrade: true
      });
    }
  } catch (error) {
    console.error('Error switching language:', error);
    res.status(500).json({
      error: 'Failed to switch language',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Upgrade to premium subscription
 */
router.post('/upgrade/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const profile = await subscriptionManager.upgradeToPremium(sessionId);
    
    res.json({
      success: true,
      message: 'Successfully upgraded to premium',
      profile: {
        subscriptionType: profile.subscriptionType,
        availableLanguages: profile.availableLanguages,
        activeLanguage: profile.activeLanguage
      }
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    res.status(500).json({
      error: 'Failed to upgrade subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Downgrade to freemium subscription
 */
router.post('/downgrade/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const profile = await subscriptionManager.downgradeToFreemium(sessionId);
    
    res.json({
      success: true,
      message: 'Successfully downgraded to freemium',
      profile: {
        subscriptionType: profile.subscriptionType,
        availableLanguages: profile.availableLanguages,
        activeLanguage: profile.activeLanguage
      }
    });
  } catch (error) {
    console.error('Error downgrading subscription:', error);
    res.status(500).json({
      error: 'Failed to downgrade subscription',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
