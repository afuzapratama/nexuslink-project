package models

type LinkStat struct {
	ID        string `json:"id" dynamodbav:"id"`
	Alias     string `json:"alias" dynamodbav:"alias"`
	NodeID    string `json:"nodeId" dynamodbav:"nodeId"`
	HitCount  int64  `json:"hitCount" dynamodbav:"hitCount"`
	LastHitAt string `json:"lastHitAt" dynamodbav:"lastHitAt"`
}
