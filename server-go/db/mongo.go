package db

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

type Mongo struct {
	Client *mongo.Client
	DB     *mongo.Database
}

func Connect(ctx context.Context, uri string) (*Mongo, error) {
	clientOpts := options.Client().ApplyURI(uri)
	clientOpts.SetAppName("bro-link-go")

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}

	dbName := "bento"
	if cs, err := connstring.ParseAndValidate(uri); err == nil {
		if cs.Database != "" {
			dbName = cs.Database
		}
	}

	return &Mongo{Client: client, DB: client.Database(dbName)}, nil
}

func (m *Mongo) Users() *mongo.Collection {
	return m.DB.Collection("users")
}

func (m *Mongo) BentoConfigs() *mongo.Collection {
	return m.DB.Collection("bentoconfigs")
}

func (m *Mongo) EnsureIndexes(ctx context.Context) error {
	unique := true
	users := m.Users()
	_, err := users.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "email", Value: 1}}, Options: &options.IndexOptions{Unique: &unique}},
		{Keys: bson.D{{Key: "username", Value: 1}}, Options: &options.IndexOptions{Unique: &unique}},
	})
	if err != nil {
		return err
	}

	configs := m.BentoConfigs()
	_, err = configs.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{Keys: bson.D{{Key: "user", Value: 1}}, Options: &options.IndexOptions{Unique: &unique}},
		{Keys: bson.D{{Key: "username", Value: 1}}, Options: &options.IndexOptions{Unique: &unique}},
	})
	if err != nil {
		return err
	}
	return nil
}

func WithTimeout(ctx context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(ctx, 5*time.Second)
}
