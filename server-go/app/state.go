package app

import (
	"brolink-server/config"
	"brolink-server/db"
)

type State struct {
	Config *config.Config
	Mongo  *db.Mongo
	Redis  *db.Redis
}
