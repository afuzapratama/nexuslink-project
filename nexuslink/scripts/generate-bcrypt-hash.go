package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "admin"
	if len(os.Args) > 1 {
		password = os.Args[1]
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		panic(err)
	}

	fmt.Println("Password:", password)
	fmt.Println("Bcrypt Hash:", string(hash))

	// Verify
	err = bcrypt.CompareHashAndPassword(hash, []byte(password))
	if err != nil {
		fmt.Println("❌ Verification FAILED")
	} else {
		fmt.Println("✅ Verification OK")
	}
}
