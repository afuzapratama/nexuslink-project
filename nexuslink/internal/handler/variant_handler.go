package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/afuzapratama/nexuslink/internal/models"
	"github.com/afuzapratama/nexuslink/internal/repository"
)

type VariantHandler struct {
	variantRepo *repository.LinkVariantRepository
	linkRepo    *repository.LinkRepository
}

func NewVariantHandler(variantRepo *repository.LinkVariantRepository, linkRepo *repository.LinkRepository) *VariantHandler {
	return &VariantHandler{
		variantRepo: variantRepo,
		linkRepo:    linkRepo,
	}
}

// HandleGetVariants - GET /links/:alias/variants
func (h *VariantHandler) HandleGetVariants(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract alias from path: /links/:alias/variants
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 || pathParts[0] != "links" || pathParts[2] != "variants" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	alias := pathParts[1]

	// Verify link exists
	_, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		http.Error(w, "Link not found", http.StatusNotFound)
		return
	}

	// Get variants
	variants, err := h.variantRepo.GetByLinkID(r.Context(), alias)
	if err != nil {
		log.Printf("Error fetching variants for link %s: %v", alias, err)
		http.Error(w, "Failed to fetch variants", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"variants": variants,
		"total":    len(variants),
	})
}

// HandleCreateVariant - POST /links/:alias/variants
func (h *VariantHandler) HandleCreateVariant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract alias from path
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 || pathParts[0] != "links" || pathParts[2] != "variants" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	alias := pathParts[1]

	// Verify link exists
	_, err := h.linkRepo.GetByAlias(r.Context(), alias)
	if err != nil {
		http.Error(w, "Link not found", http.StatusNotFound)
		return
	}

	// Parse request body
	var req struct {
		Label     string `json:"label"`
		TargetURL string `json:"targetUrl"`
		Weight    int    `json:"weight"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Validate
	if req.Label == "" {
		http.Error(w, "Label is required", http.StatusBadRequest)
		return
	}
	if req.TargetURL == "" {
		http.Error(w, "Target URL is required", http.StatusBadRequest)
		return
	}
	if req.Weight < 0 || req.Weight > 100 {
		http.Error(w, "Weight must be between 0 and 100", http.StatusBadRequest)
		return
	}

	// Check total weight won't exceed 100
	existingVariants, err := h.variantRepo.GetByLinkID(r.Context(), alias)
	if err != nil {
		log.Printf("Error checking existing variants: %v", err)
		http.Error(w, "Failed to validate weight", http.StatusInternalServerError)
		return
	}
	totalWeight := req.Weight
	for _, v := range existingVariants {
		totalWeight += v.Weight
	}
	if totalWeight > 100 {
		http.Error(w, "Total weight exceeds 100%", http.StatusBadRequest)
		return
	}

	// Create variant
	variant := &models.LinkVariant{
		ID:          generateVariantID(),
		LinkID:      alias,
		Label:       req.Label,
		TargetURL:   req.TargetURL,
		Weight:      req.Weight,
		Clicks:      0,
		Conversions: 0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := h.variantRepo.Create(r.Context(), variant); err != nil {
		log.Printf("Error creating variant: %v", err)
		http.Error(w, "Failed to create variant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(variant)
}

// HandleUpdateVariant - PUT /links/:alias/variants/:id
func (h *VariantHandler) HandleUpdateVariant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract alias and variantID from path: /links/:alias/variants/:id
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) != 4 || pathParts[0] != "links" || pathParts[2] != "variants" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	alias := pathParts[1]
	variantID := pathParts[3]

	// Get existing variant
	existing, err := h.variantRepo.GetByID(r.Context(), alias, variantID)
	if err != nil {
		http.Error(w, "Variant not found", http.StatusNotFound)
		return
	}

	// Parse request body
	var req struct {
		Label     *string `json:"label"`
		TargetURL *string `json:"targetUrl"`
		Weight    *int    `json:"weight"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Update fields if provided
	if req.Label != nil {
		existing.Label = *req.Label
	}
	if req.TargetURL != nil {
		existing.TargetURL = *req.TargetURL
	}
	if req.Weight != nil {
		if *req.Weight < 0 || *req.Weight > 100 {
			http.Error(w, "Weight must be between 0 and 100", http.StatusBadRequest)
			return
		}

		// Check total weight won't exceed 100
		allVariants, err := h.variantRepo.GetByLinkID(r.Context(), alias)
		if err != nil {
			log.Printf("Error checking existing variants: %v", err)
			http.Error(w, "Failed to validate weight", http.StatusInternalServerError)
			return
		}
		totalWeight := *req.Weight
		for _, v := range allVariants {
			if v.ID != variantID {
				totalWeight += v.Weight
			}
		}
		if totalWeight > 100 {
			http.Error(w, "Total weight exceeds 100%", http.StatusBadRequest)
			return
		}

		existing.Weight = *req.Weight
	}

	existing.UpdatedAt = time.Now()

	if err := h.variantRepo.Update(r.Context(), existing); err != nil {
		log.Printf("Error updating variant: %v", err)
		http.Error(w, "Failed to update variant", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(existing)
}

// HandleDeleteVariant - DELETE /links/:alias/variants/:id
func (h *VariantHandler) HandleDeleteVariant(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract alias and variantID from path
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) != 4 || pathParts[0] != "links" || pathParts[2] != "variants" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	alias := pathParts[1]
	variantID := pathParts[3]

	// Verify variant exists
	_, err := h.variantRepo.GetByID(r.Context(), alias, variantID)
	if err != nil {
		http.Error(w, "Variant not found", http.StatusNotFound)
		return
	}

	if err := h.variantRepo.Delete(r.Context(), alias, variantID); err != nil {
		log.Printf("Error deleting variant: %v", err)
		http.Error(w, "Failed to delete variant", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// HandleConvert - POST /links/:alias/convert?variantId=xxx
func (h *VariantHandler) HandleConvert(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract alias from path: /links/:alias/convert
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) != 3 || pathParts[0] != "links" || pathParts[2] != "convert" {
		http.Error(w, "Invalid path", http.StatusBadRequest)
		return
	}
	alias := pathParts[1]

	// Get variantId from query
	variantID := r.URL.Query().Get("variantId")
	if variantID == "" {
		http.Error(w, "variantId query parameter required", http.StatusBadRequest)
		return
	}

	// Verify variant exists
	_, err := h.variantRepo.GetByID(r.Context(), alias, variantID)
	if err != nil {
		http.Error(w, "Variant not found", http.StatusNotFound)
		return
	}

	// Increment conversion counter
	if err := h.variantRepo.IncrementConversions(r.Context(), alias, variantID); err != nil {
		log.Printf("Error incrementing conversion for variant %s: %v", variantID, err)
		http.Error(w, "Failed to track conversion", http.StatusInternalServerError)
		return
	}

	log.Printf("Conversion tracked for link %s, variant %s", alias, variantID)
	w.WriteHeader(http.StatusNoContent)
}

// Helper function to generate variant ID
func generateVariantID() string {
	// Simple timestamp-based ID for now
	return "var-" + time.Now().Format("20060102150405")
}
