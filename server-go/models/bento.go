package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Widget struct {
	ID          string `bson:"id" json:"id"`
	Size        string `bson:"size" json:"size"`
	URL         string `bson:"url,omitempty" json:"url,omitempty"`
	CustomTitle string `bson:"customTitle,omitempty" json:"customTitle,omitempty"`
	CustomImage string `bson:"customImage,omitempty" json:"customImage,omitempty"`
	CTAText     string `bson:"ctaText,omitempty" json:"ctaText,omitempty"`
	ImageFit    string `bson:"imageFit,omitempty" json:"imageFit,omitempty"`
}

type BentoConfig struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	User      primitive.ObjectID     `bson:"user" json:"user"`
	Username  string                 `bson:"username" json:"username"`
	Widgets   []Widget               `bson:"widgets,omitempty" json:"widgets"`
	Layouts   map[string]interface{} `bson:"layouts,omitempty" json:"layouts"`
	CreatedAt *primitive.DateTime    `bson:"createdAt,omitempty" json:"created_at,omitempty"`
	UpdatedAt *primitive.DateTime    `bson:"updatedAt,omitempty" json:"updated_at,omitempty"`
}
