"use strict";
module.exports = function (sequelize, DataTypes) {
    var User = sequelize.define("User", {
        name: {
            type: DataTypes.STRING,
            validate: {
                notNull: true,
                notEmpty: true
            }
        },
        password: {
            type: DataTypes.STRING,
            validate: {
                notNull: true,
                notEmpty: true,
                isHexidecimal: true
            }
        },
        uid: DataTypes.STRING
    }, {
        classMethods: {
            associate: function (models) {
                User.hasMany(models.Post);
            }
        }
    });
    return User;
};