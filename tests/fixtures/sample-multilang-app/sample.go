// Sample Go file for Zaria multi-language fixture.
package main

import (
	"fmt"
	"os"
	"strings"
)

// Record holds key-value data.
type Record struct {
	ID    int
	Name  string
	Value float64
}

// Processor handles a slice of records.
type Processor interface {
	Process(records []Record) []Record
}

// TrimProcessor trims string values in records.
type TrimProcessor struct {
	prefix string
}

func NewTrimProcessor(prefix string) *TrimProcessor {
	return &TrimProcessor{prefix: prefix}
}

func (p *TrimProcessor) Process(records []Record) []Record {
	out := make([]Record, 0, len(records))
	for _, r := range records {
		r.Name = strings.TrimSpace(r.Name)
		out = append(out, r)
	}
	return out
}

func loadFile(path string) (string, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func writeFile(path, content string) error {
	return os.WriteFile(path, []byte(content), 0o644)
}

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: sample <path>")
		os.Exit(1)
	}
	content, err := loadFile(os.Args[1])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Println(content)
}
