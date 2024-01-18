<script>
import AuthService from "../services/authservice";
import {mapGetters, mapMutations} from "vuex";
import getters from "../store/gettersWindSimulation";
import mutations from "../store/mutationsWindSimulation";

export default {
    name: "AuthLogIn",
    data () {
        return {
            email: "",
            password: "",
            saveLogin: false
        };
    },
    computed: {
        ...mapGetters("Tools/WindSimulation", Object.keys(getters))
    },
    mounted () {
        this.email = localStorage.getItem("dcs_user") || "";
        this.pw = localStorage.getItem("dcs_pw") || "";
    },
    methods: {
        ...mapMutations("Tools/WindSimulation", Object.keys(mutations)),
        async onSubmit () {
            try {
                try {
                    const response = await AuthService.login(this.email, this.password);

                    if (response.access_token) {
                        this.setAccessToken(response.access_token);
                        localStorage.setItem("refreshToken", response.refresh_token);
                        this.setAuthenticated(true);
                    }

                    if (this.saveLogin && response.refresh_token) {
                        localStorage.setItem("oldAccessToken", response.refresh_token);
                        localStorage.setItem("loginSaved", true);
                        localStorage.setItem("dcs_user", this.email);
                        localStorage.setItem("dcs_pw", this.password);
                        this.setRefreshToken(response.refresh_token);
                    }

                }
                catch (error) {
                    console.error(error);
                }
            }
            catch (error) {
                console.error(error);
            }
        }
    }
};
</script>

<template>
    <div>
        <form @submit.prevent="onSubmit">
            <label for="email">{{ $t("additional:modules.tools.windSimulation.auth.mail") }}</label>
            <input
                v-model="email"
                type="email"
                placeholder="Email"
            >
            <label for="password">{{ $t("additional:modules.tools.windSimulation.auth.pw") }}</label>
            <input
                v-model="password"
                type="password"
                placeholder="Password"
            >
            <label
                id="flex_label"
                for="save-login"
            >
                <input
                    id="save-login"
                    v-model="saveLogin"
                    type="checkbox"
                >{{ $t("additional:modules.tools.windSimulation.auth.save") }}
            </label>
            <button type="submit">
                Log In
            </button>
        </form>
    </div>
</template>

<style scoped lang="scss">
    @import "../utils/variables.scss";
    form {
            display:flex;
            flex-flow:row wrap;
            padding:0px 30px;

        label {
            flex: 0 0 100%;
            color: #444;
            margin-bottom: 3px;
            font-size: 120%;
            box-sizing: border-box;
            font-weight: 100;
            font-family: sans-serif;
        }

        #flex_label {
            display:flex;
            align-items:center;
            justify-content:flex-start;
            align-items: center;
            justify-content: space-between;
            flex: 0 0 180px;

            input {
                flex: 0 0 20px;
            }
        }

        input {
            flex: 0 0 100%;
            margin: 0px 0px 10px 0px;
            height: 40px;
            line-height: 40px;
            border-radius: 5px;
            padding: 10px;
            box-sizing: border-box;
            background: whitesmoke;
            border: none;
            border-bottom: 1px solid #ccc;
            font-family:system-ui;
            font-size:130%;
        }

        button {
            background: $masterportal_blue;
            color:whitesmoke;
            outline:none;
            border:none;
            border-radius: 8px;
            font-size: 120%;
            min-width: 150px;
            margin: 3px 0px 0px auto;
            padding:10px 20px;
            box-sizing: border-box;
        }
    }
</style>
