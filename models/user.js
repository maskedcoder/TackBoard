"use strict";
module.exports = function (sequelize, DataTypes) {
    var User = sequelize.define("User", {
        name: {
            type: DataTypes.STRING,
            validate: {
               notEmpty: {
                    msg: "Name missing"
                },
                unique: function (value, next) {
                    User.find({
                        where: { name: value },
                        attributes: ['id']
                    })
                    .done(function (error, user) {
                        if (error)
                            return next(error);
                        if (user)
                            return next('Name must be unique');
                        next();
                    });
                }
            }
        },
        password: {
            type: DataTypes.STRING,
            validate: {
                notEmpty: {
                    msg: "Password missing"
                },
                not: {
                    args: ["[g-z]", "i"],
                    msg: "Password must be hexidecimal encoded"
                }
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