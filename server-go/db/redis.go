package db

import (
	"context"
	"encoding/json"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	Client *redis.Client
}

func ConnectRedis(url string) (*Redis, error) {
	opts, err := redis.ParseURL(url)
	if err != nil {
		return nil, err
	}
	client := redis.NewClient(opts)
	return &Redis{Client: client}, nil
}

func (r *Redis) GetJSON(ctx context.Context, key string, dest any) (bool, error) {
	val, err := r.Client.Get(ctx, key).Result()
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return false, nil
	}
	return true, nil
}

func (r *Redis) SetJSON(ctx context.Context, key string, value any, ttl time.Duration) error {
	payload, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return r.Client.Set(ctx, key, payload, ttl).Err()
}

func (r *Redis) Del(ctx context.Context, key string) error {
	return r.Client.Del(ctx, key).Err()
}
