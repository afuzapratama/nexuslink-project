package util

import (
	"math/rand"

	"github.com/afuzapratama/nexuslink/internal/models"
)

// SelectVariantByWeight chooses a variant based on weight distribution
// Uses weighted random selection algorithm
// Example: weights [30, 50, 20] → variant picked based on cumulative probabilities
func SelectVariantByWeight(variants []models.LinkVariant) *models.LinkVariant {
	if len(variants) == 0 {
		return nil
	}

	// Calculate total weight
	totalWeight := 0
	for _, v := range variants {
		totalWeight += v.Weight
	}

	// If total weight is 0, return first variant
	if totalWeight == 0 {
		return &variants[0]
	}

	// Generate random number between 0 and totalWeight
	randNum := rand.Intn(totalWeight)

	// Find the variant that corresponds to this random number
	cumulative := 0
	for i := range variants {
		cumulative += variants[i].Weight
		if randNum < cumulative {
			return &variants[i]
		}
	}

	// Fallback to last variant (should not reach here)
	return &variants[len(variants)-1]
}
