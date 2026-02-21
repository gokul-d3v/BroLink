package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username  string             `bson:"username" json:"username"`
	Email     string             `bson:"email" json:"email"`
	Password  string             `bson:"password" json:"-"`
	FullName  *string            `bson:"full_name,omitempty" json:"full_name,omitempty"`
	AvatarURL *string            `bson:"avatar_url,omitempty" json:"avatar_url,omitempty"`
	Role      string             `bson:"role" json:"role"`
	IsBlocked bool               `bson:"is_blocked" json:"is_blocked"`
	CreatedAt *primitive.DateTime `bson:"createdAt,omitempty" json:"created_at,omitempty"`
	UpdatedAt *primitive.DateTime `bson:"updatedAt,omitempty" json:"updated_at,omitempty"`
}

func (u *User) Public() PublicUser {
	return PublicUser{
		ID:        u.ID.Hex(),
		Username:  u.Username,
		Email:     u.Email,
		Role:      u.Role,
		IsBlocked: u.IsBlocked,
		FullName:  u.FullName,
		AvatarURL: u.AvatarURL,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

func (u *User) Admin() AdminUser {
	return AdminUser{
		ID:        u.ID.Hex(),
		Username:  u.Username,
		Email:     u.Email,
		Role:      u.Role,
		IsBlocked: u.IsBlocked,
		FullName:  u.FullName,
		AvatarURL: u.AvatarURL,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}

type PublicUser struct {
	ID        string             `json:"id"`
	Username  string             `json:"username"`
	Email     string             `json:"email"`
	Role      string             `json:"role"`
	IsBlocked bool               `json:"is_blocked"`
	FullName  *string            `json:"full_name,omitempty"`
	AvatarURL *string            `json:"avatar_url,omitempty"`
	CreatedAt *primitive.DateTime `json:"created_at,omitempty"`
	UpdatedAt *primitive.DateTime `json:"updated_at,omitempty"`
}

type AdminUser struct {
	ID        string             `json:"id"`
	Username  string             `json:"username"`
	Email     string             `json:"email"`
	Role      string             `json:"role"`
	IsBlocked bool               `json:"is_blocked"`
	FullName  *string            `json:"full_name,omitempty"`
	AvatarURL *string            `json:"avatar_url,omitempty"`
	CreatedAt *primitive.DateTime `json:"created_at,omitempty"`
	UpdatedAt *primitive.DateTime `json:"updated_at,omitempty"`
}
